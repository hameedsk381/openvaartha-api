"""One-time: generate a VAPID keypair for Web Push notifications.

Run locally (not on the server):
    python scripts/generate_vapid_keys.py

Copy the two printed lines into VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in your
deployment environment (see app/config.py, docker-compose.yml). Never commit
real key values to the repo — treat the private key like JWT_SECRET_KEY or
GCS credentials: a secret, env-only value.

Keys are raw base64url-encoded EC (P-256) points/scalars — the format the
Web Push spec expects for pushManager.subscribe({applicationServerKey}) on
the frontend and pywebpush's vapid_private_key on the backend.
"""
import base64

from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    numbers = private_key.private_numbers()
    public_numbers = numbers.public_numbers

    # Raw uncompressed EC point: 0x04 || X (32 bytes) || Y (32 bytes).
    x = public_numbers.x.to_bytes(32, "big")
    y = public_numbers.y.to_bytes(32, "big")
    public_raw = b"\x04" + x + y

    private_raw = numbers.private_value.to_bytes(32, "big")

    print(f"VAPID_PUBLIC_KEY={_b64url(public_raw)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(private_raw)}")


if __name__ == "__main__":
    main()
