"use client";


import { tr } from "../lib/i18n";
import { useEffect } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function messageFor(field: Field): string {
  const state = field.validity;
  if (state.valueMissing) {
    return field instanceof HTMLSelectElement || (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type))
      ? tr("Vui lòng chọn một mục.")
      : tr("Vui lòng điền thông tin này.");
  }
  if (state.typeMismatch) {
    return field instanceof HTMLInputElement && field.type === "url" ? tr("Vui lòng nhập đường dẫn (URL) hợp lệ.") : tr("Vui lòng nhập địa chỉ email hợp lệ.");
  }
  if (state.tooShort) return tr("Cần nhập ít nhất {0} ký tự.", (field as HTMLInputElement).minLength);
  if (state.tooLong) return tr("Chỉ được nhập tối đa {0} ký tự.", (field as HTMLInputElement).maxLength);
  if (state.rangeUnderflow) return tr("Giá trị phải lớn hơn hoặc bằng {0}.", (field as HTMLInputElement).min);
  if (state.rangeOverflow) return tr("Giá trị phải nhỏ hơn hoặc bằng {0}.", (field as HTMLInputElement).max);
  if (state.stepMismatch) return tr("Giá trị không hợp lệ, hãy nhập đúng bước nhảy cho phép.");
  if (state.patternMismatch) return field.title || tr("Định dạng chưa đúng.");
  if (state.badInput) return tr("Giá trị nhập vào không hợp lệ.");
  return "";
}

/** Browsers show their own validation bubbles in the browser's language; this shows them in Vietnamese. */
export function NativeValidationMessages() {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      const field = event.target as Field;
      field.setCustomValidity("");
      const message = messageFor(field);
      if (message) field.setCustomValidity(message);
    };
    const reset = (event: Event) => (event.target as Field).setCustomValidity?.("");

    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", reset, true);
    document.addEventListener("change", reset, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", reset, true);
      document.removeEventListener("change", reset, true);
    };
  }, []);

  return null;
}
