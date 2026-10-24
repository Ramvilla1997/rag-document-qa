export interface TextChunk {
  index: number;
  text: string;
}

export function chunkText(text: string, sizeWords: number, overlapWords: number): TextChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const step = sizeWords - overlapWords;
  const chunks: TextChunk[] = [];
  for (let start = 0; start < words.length; start += step) {
    const window = words.slice(start, start + sizeWords);
    chunks.push({ index: chunks.length, text: window.join(' ') });
    if (start + sizeWords >= words.length) {
      break;
    }
  }
  return chunks;
}
