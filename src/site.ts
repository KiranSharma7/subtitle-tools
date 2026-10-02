export const site = {
  name: 'SubtitleMate',
  url: 'https://subtitlemate.com',
  email: 'hello@subtitlemate.com',
  author: 'Kiran Sharma',
  gaId: 'G-5CVNZWW1RY',
};

// The build (format 'file') sees /contact.html and /index.html; the served URLs are /contact and /.
export const cleanPath = (pathname: string) => pathname.replace(/(index)?\.html$/, '');
