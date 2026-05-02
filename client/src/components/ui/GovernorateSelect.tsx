import { EGYPT_GOVERNORATES } from "@shared/constants";
import { useTranslation } from "react-i18next";

interface GovernorateSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

export function GovernorateSelect({
  value,
  onChange,
  required = false,
  className = "",
  placeholder,
  id = "governorate",
}: GovernorateSelectProps) {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder || t("governorateSelect.selectGovernorate");
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      dir="rtl"
    >
      <option value="">{effectivePlaceholder}</option>
      {EGYPT_GOVERNORATES.map((gov) => (
        <option key={gov} value={gov}>
          {gov}
        </option>
      ))}
    </select>
  );
}
