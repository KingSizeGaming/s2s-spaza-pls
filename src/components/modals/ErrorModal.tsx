import Button from '@/components/ui/Button';

export default function ErrorModal({title, message, onClose}: {title: string; message: string; onClose: () => void}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-4 py-6 pb-10 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="font-extrabold text-2xl tracking-wide">{title}</h2>
          <p className="text-xl">{message}</p>
          <span className="absolute -bottom-6">
            <Button onClick={onClose}>CLOSE</Button>
          </span>
        </div>
      </div>
    </div>
  );
}
