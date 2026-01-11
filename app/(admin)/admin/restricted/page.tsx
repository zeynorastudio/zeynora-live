// Shown when admin tries to access modules they do not have permissions for.

export default function RestrictedAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="p-10 text-night text-xl">Access Restricted</div>
    </div>
  );
}
