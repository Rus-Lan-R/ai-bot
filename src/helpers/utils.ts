import { MessageContent } from "openai/resources/beta/threads/messages";

export const extractTextWithoutAnnotations = (data: MessageContent[]) => {
  return data
    .map((item) => {
      if (item.type === "text" && item.text && item.text.value) {
        let textValue = item.text.value;
        item.text.annotations.forEach((annotation) => {
          textValue = textValue.replace(annotation.text, "");
        });
        return textValue.trim();
      }
      return "";
    })
    .filter((value) => value !== "")
    .join("\n");
};
