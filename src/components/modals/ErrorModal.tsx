import Image from 'next/image';
// import Button from '@/components/ui/Button';

export default function ErrorModal({title, message, onClose}: {title: string; message: string; onClose: () => void}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* <div className="bg-purple-light p-3 rounded-2xl max-w-100">
        <div className="bg-purple-dark rounded-xl px-4 py-6 pb-10 relative flex flex-col items-center gap-2 text-center shadow-2xl">
          <h2 className="font-extrabold text-2xl tracking-wide">{title}</h2>
          <p className="text-xl">{message}</p>
          <span className="absolute -bottom-6">
            <Button onClick={onClose}>CLOSE</Button>
          </span>
        </div>
      </div> */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <Image src="/images/pop_up_no_text_frame_panel.png" alt="" width={320} height={200} className="max-w-xs" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h2 className="font-semibold text-3xl tracking-wider">{title}</h2>
            <p className="text-xl mt-1">{message}</p>
          </div>
        </div>
        <span className="absolute -bottom-4">
          <button
            onClick={onClose}
            className="w-28 h-12 bg-[url('/images/exit_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/exit_button_tapped.png')]"
          />
        </span>
      </div>
    </div>
  );
}
