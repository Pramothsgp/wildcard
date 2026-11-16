// Brand panel for the admin sign-in page.

export function AdminAside() {
  return (
    <div className="relative flex w-full flex-col justify-between bg-slate-950 p-12 text-slate-100">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div aria-hidden className="absolute -right-24 top-1/3 size-96 rounded-full bg-blue-600/20 blur-3xl" />
      <p className="relative flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-9 place-items-center rounded-lg bg-blue-600 text-sm font-black">W</span>
        Wildcard Admin
      </p>
      <div className="relative max-w-md space-y-4">
        <h2 className="text-4xl font-bold leading-tight">Keep the tables fair.</h2>
        <p className="text-slate-400">See every player account, and ban or unban when someone breaks the rules.</p>
      </div>
      <p className="relative text-sm text-slate-500">Restricted area. Only approved admin emails can get in.</p>
    </div>
  );
}
