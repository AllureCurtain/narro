import { saveLlmSettingsAction } from "@/app/actions";

interface ModelSettingsFormProps {
  settings: Record<string, string>;
}

export function ModelSettingsForm({ settings }: ModelSettingsFormProps) {
  return (
    <section aria-labelledby="model-settings-heading" className="rounded-md border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-950" id="model-settings-heading">
        模型设置
      </h2>
      <form action={saveLlmSettingsAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1.5fr_1fr_1fr_auto] md:items-end">
        <Field defaultValue={settings["llm.provider"] ?? "openai-compatible"} label="Provider" name="provider" />
        <Field
          defaultValue={settings["llm.baseUrl"] ?? ""}
          label="Base URL"
          name="baseUrl"
          placeholder="https://api.openai.com/v1"
        />
        <Field defaultValue={settings["llm.model"] ?? ""} label="Model" name="model" placeholder="gpt-5-mini" />
        <Field label="API Key" name="apiKey" placeholder={settings["llm.apiKey"] ? "已保存，留空不修改" : "sk-..."} type="password" />
        <button className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700" type="submit">
          保存
        </button>
      </form>
    </section>
  );
}

interface FieldProps {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}

function Field({ defaultValue, label, name, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
