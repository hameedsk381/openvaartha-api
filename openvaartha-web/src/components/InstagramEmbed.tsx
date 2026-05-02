import React from 'react';
import { InstagramEmbed as Embed } from 'react-social-media-embed';

interface InstagramEmbedProps {
  url: string;
}

const InstagramEmbed: React.FC<InstagramEmbedProps> = ({ url }) => {
  return (
    <div className="instagram-embed-container my-12 flex justify-center w-full">
      <div style={{ width: '100%', maxWidth: '540px' }}>
        <Embed url={url} width="100%" />
      </div>
    </div>
  );
};

export default InstagramEmbed;
