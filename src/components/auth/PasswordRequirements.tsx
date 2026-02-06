interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  requirements: PasswordRequirement[];
}

export function PasswordRequirements({ requirements }: PasswordRequirementsProps) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-gray-700">Wymagania hasła:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                req.met ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}
              aria-label={req.met ? "Spełnione" : "Niespełnione"}
            >
              {req.met ? "✓" : "○"}
            </span>
            <span className={req.met ? "text-green-700" : "text-gray-600"}>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
