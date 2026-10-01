export function AppFrame({ html, title }: { html: string; title: string }) {
  return (
    <iframe
      title={title}
      sandbox="allow-scripts allow-forms allow-modals"
      referrerPolicy="no-referrer"
      srcDoc={html}
      className="h-[70vh] w-full rounded-2xl border border-line bg-card"
    />
  );
}
