'use client';

interface BookCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function BookCheckbox({ checked, disabled, onToggle }: BookCheckboxProps) {
  return (
    <td className="px-4 py-3 text-center">
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-checked={checked}
        role="checkbox"
        className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          checked
            ? 'bg-green-500 border-green-500'
            : 'bg-transparent border-zinc-600 hover:border-zinc-400'
        }`}
      >
        {checked && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>
    </td>
  );
}
