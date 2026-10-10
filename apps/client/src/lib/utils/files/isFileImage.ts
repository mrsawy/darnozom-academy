export function isFileImage(fileName: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
}
