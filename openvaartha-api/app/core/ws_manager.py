import asyncio
import json
import logging
import redis.asyncio as redis
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

from app.config import settings

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis: redis.Redis = None
        self.pubsub = None
        self.channel_name = "openvaartha:events"
        self.listen_task = None

    async def connect_redis(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(self.channel_name)
        logger.info(f"Subscribed to Redis channel: {self.channel_name}")
        self.listen_task = asyncio.create_task(self._listen_to_redis())

    async def disconnect_redis(self):
        if self.listen_task:
            self.listen_task.cancel()
        if self.pubsub:
            await self.pubsub.unsubscribe(self.channel_name)
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def _listen_to_redis(self):
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    # Broadcast to all local websocket connections
                    await self._broadcast_local(data)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in Redis listener: {e}")

    async def _broadcast_local(self, message: str):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast(self, event_type: str, payload: Dict[str, Any]):
        """Publish an event to Redis so all workers receive it and broadcast locally."""
        if not self.redis:
            return
            
        message = json.dumps({
            "type": event_type,
            "data": payload
        })
        await self.redis.publish(self.channel_name, message)

manager = WebSocketManager()
