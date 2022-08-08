import { renderToStaticMarkup } from 'react-dom/server';
import { Viewer } from '@bytemd/react';
import removeMarkdown from 'remove-markdown';

import { Feed } from 'feed';
import webserver from 'infra/webserver.js';

function generateRss2(contentList) {
  const webserverHost = webserver.getHost();

  // TODO: make this property flexible in the future to
  // support things like: `/[username]/rss`
  const feedURL = `${webserverHost}/recentes/rss`;

  const feed = new Feed({
    title: 'TabNews',
    description: 'Conteúdos para quem trabalha com Programação e Tecnologia',
    id: feedURL,
    link: feedURL,
    image: `${webserverHost}/default-image-share.png`,
    favicon: `${webserverHost}/favicon-mobile.png`,
    language: 'pt',
    updated: contentList.length > 0 ? new Date(contentList[0].updated_at) : new Date(),
    feedLinks: {
      rss2: feedURL,
    },
  });

  contentList.forEach((contentObject) => {
    const contentUrl = `${webserverHost}/${contentObject.username}/${contentObject.slug}`;

    feed.addItem({
      title: contentObject.title,
      id: contentObject.id,
      link: contentUrl,
      description: removeMarkdown(contentObject.body).replace(/\s+/g, ' ').substring(0, 190) + '...',
      content: renderToStaticMarkup(<Viewer value={contentObject.body} />).replace(/[\r\n]/gm, ''),
      author: [
        {
          name: contentObject.username,
          link: `${webserverHost}/${contentObject.username}`,
        },
      ],
      date: new Date(contentObject.published_at),
    });
  });

  return feed.rss2();
}

export default Object.freeze({
  generateRss2,
});
