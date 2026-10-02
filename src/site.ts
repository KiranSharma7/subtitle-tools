// gaId is still a placeholder: set it before launch.
export const site = {
  name: 'SubtitleMate',
  url: 'https://subtitlemate.com',
  email: 'hello@subtitlemate.com',
  gaId: 'G-XXXXXXXXXX',
};

// The build (format 'file') sees /contact.html and /index.html; the served URLs are /contact and /.
export const cleanPath = (pathname: string) => pathname.replace(/(index)?\.html$/, '');
