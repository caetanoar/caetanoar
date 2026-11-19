"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { mascararMoedaDigitada, formatarNumeroMoeda } from "@/lib/format/moeda";
import { formatarDocumento } from "@/lib/format/documentos";
import { formatarTelefone } from "@/lib/format/telefone";
import { formatarPlaca } from "@/lib/format/veiculo";
import { cn } from "@/lib/utils";

type InputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "defaultValue"> & {
  defaultValue?: string | number | null;
  onValorChange?: (valor: string) => void;
};

/** Campo em reais com máscara "1.234,56". Envia o texto formatado no formulário. */
export function InputMoeda({ defaultValue, onValorChange, className, ...props }: InputProps) {
  const inicial =
    typeof defaultValue === "number" ? formatarNumeroMoeda(defaultValue) : defaultValue ? String(defaultValue) : "";
  const [valor, setValor] = React.useState(inicial);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        inputMode="numeric"
        autoComplete="off"
        className={cn("numero pl-9", className)}
        value={valor}
        onChange={(e) => {
          const v = mascararMoedaDigitada(e.target.value);
          setValor(v);
          onValorChange?.(v);
        }}
        {...props}
      />
    </div>
  );
}

function criarInputMascarado(formatar: (v: string) => string, padrao: Partial<React.ComponentProps<"input">>) {
  return function InputMascarado({ defaultValue, onValorChange, ...props }: InputProps) {
    const [valor, setValor] = React.useState(defaultValue ? formatar(String(defaultValue)) : "");
    return (
      <Input
        {...padrao}
        value={valor}
        onChange={(e) => {
          const v = formatar(e.target.value);
          setValor(v);
          onValorChange?.(v);
        }}
        {...props}
      />
    );
  };
}

export const InputDocumento = criarInputMascarado(formatarDocumento, { inputMode: "numeric", autoComplete: "off", placeholder: "CPF ou CNPJ" });
export const InputTelefone = criarInputMascarado(formatarTelefone, { inputMode: "tel", autoComplete: "tel", placeholder: "(37) 99999-9999" });
export const InputPlaca = criarInputMascarado(formatarPlaca, { autoCapitalize: "characters", autoComplete: "off", placeholder: "ABC1D23", maxLength: 8 });

function isoParaBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function brParaISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return "";
  const [, dd, mm, aaaa] = m;
  const d = new Date(Date.UTC(Number(aaaa), Number(mm) - 1, Number(dd)));
  if (d.getUTCDate() !== Number(dd) || d.getUTCMonth() !== Number(mm) - 1) return "";
  return `${aaaa}-${mm}-${dd}`;
}

function mascararData(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Data sempre em dd/mm/aaaa, em qualquer celular (o campo nativo segue o idioma do aparelho).
 * O formulário recebe o valor em ISO (aaaa-mm-dd) no campo `name`.
 */
export function InputData({
  name,
  defaultValue,
  onValorChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "defaultValue" | "type"> & {
  defaultValue?: string | null;
  onValorChange?: (iso: string) => void;
}) {
  const [texto, setTexto] = React.useState(isoParaBR(defaultValue));
  const iso = brParaISO(texto);
  return (
    <>
      <Input
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        autoComplete="off"
        maxLength={10}
        className={cn("numero", className)}
        value={texto}
        aria-invalid={texto.length === 10 && !iso ? true : props["aria-invalid"]}
        onChange={(e) => {
          const v = mascararData(e.target.value);
          setTexto(v);
          onValorChange?.(brParaISO(v));
        }}
        {...props}
      />
      {name && <input type="hidden" name={name} value={iso} />}
    </>
  );
}
