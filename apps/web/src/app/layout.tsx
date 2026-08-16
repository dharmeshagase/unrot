export const metadata = {
  title: "Unrot",
  description: "A one-minute imagination workout"
};

export default function RootLayout({
  children,
  stylesheetHref = "/globals.css",
  pageTitle = metadata.title
} = {}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
    <meta name="description" content="${metadata.description}" />
    <meta name="theme-color" content="#F7F4ED" />
    <link rel="stylesheet" href="${stylesheetHref}" />
  </head>
  <body>
    <a class="skip-to-content" href="#main-content">Skip to content</a>
    ${children ?? ""}
  </body>
</html>`;
}
