import { ReactNode } from "react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileMenu({ isOpen, onClose, children }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-72 bg-[#07070f] border-r border-white/5 z-40 lg:hidden overflow-y-auto">
        {children}
      </div>
    </>
  );
}
