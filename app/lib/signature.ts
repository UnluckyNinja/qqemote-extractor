const signatures = {
  jpg: [0xFF, 0xD8, 0xFF],
  gif: [0x47, 0x49, 0x46, 0x38],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  webp: [0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50],
  bmp: [0x42, 0x4D],
}

const extensions = {
  jpg: /\.(jpg|jpeg)$/,
  gif: /\.gif$/,
  png: /\.png$/,
  webp: /\.webp$/,
  bmp: /\.bmp$/,
} satisfies Record<keyof typeof signatures, RegExp>


export function normalizeFileName(typedArray: Uint8Array, name: string) {
  for (const _key of Object.keys(signatures)) {
    const key = _key as keyof typeof signatures
    if (matchSig(typedArray, signatures[key])) {
      if (extensions[key].test(name)) {
        return name
      }
      return name+'.'+key
    }
  }
  return name
}

function matchSig(typedArray: Uint8Array, sig: number[], offset = 0) {
  for (let i = 0; i < sig.length; i++) {
    if (sig[i]! >= 0 && sig[i] !== typedArray[i+offset]) {
      return false
    }
  }
  return true
}

