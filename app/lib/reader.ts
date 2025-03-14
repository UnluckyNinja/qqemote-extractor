import { CompoundFileBinary, readDirectoryEntryInfo, readStreamObjectContent } from 'cfb-reader';
import { Zip, ZipDeflate } from 'fflate'
import { normalizeFileName } from './signature';
import { createTimer } from './timer';

onmessage = function (e){
  const msg = e.data as InMessage
  if (msg.type === 'buffer') {
    zipCompoundFileBinary(msg.buffer)
  }
}

export type InMessage = {
  type: 'buffer'
  buffer: ArrayBuffer
}

export type OutMessage = {
  type: 'done'
  buffer: ArrayBuffer
} | {
  type: 'size'
  size: number
} | {
  type: 'file'
  file: number
}

function send(msg: OutMessage) {
  if (msg.type === 'done') {
    postMessage(msg, [msg.buffer])
  } else {
    postMessage(msg)
  }
}

export function zipCompoundFileBinary(buffer: ArrayBuffer){
  let cfb
  try {
    cfb = new CompoundFileBinary(buffer)
  } catch {
    throw new Error('Invalid CFB File')
  }
  extractCFB(cfb, (blob)=>{
    const buffer = (blob.buffer as ArrayBuffer).transferToFixedLength()
    send({type: 'done', buffer})
  })
}

function extractCFB(cfb: CompoundFileBinary, cb: (blob: Uint8Array) => void) {
  const MAX_ZIP_SIZE_IN_BYTES = 500 * 1024 * 1024
  const MAX_POSSIBLE_SIZE_PER_FILE = 50 * 1024 * 1024

  const buffer = new ArrayBuffer(1024, { maxByteLength: MAX_ZIP_SIZE_IN_BYTES })
  const blob = new Uint8Array(buffer)

  let totalSize = 0

  const sizeTimer = createTimer()

  const zip = new Zip((err, dat, final) => {
    if (err) {
      throw err
    }

    const offset = totalSize

    totalSize += dat.byteLength

    if (buffer.byteLength < totalSize) {
      buffer.resize(totalSize)
    }
    
    blob.set(dat, offset)

    sizeTimer.doIfPassed(()=>{
      send({type: 'size', size: totalSize})
    }, {delta: 100, mark: true})

    if (final) {
      send({type: 'size', size: totalSize})
      send({type: 'file', file: totalFiles})
      cb(blob)
    }
  })

  // all files share a buffer to reduce memory usage
  const tempBuffer = new ArrayBuffer(1*1024*1024, { maxByteLength: MAX_POSSIBLE_SIZE_PER_FILE })
  const tempU8Array = new Uint8Array(tempBuffer)

  // report progress
  let totalFiles = 0
  const fileTimer = createTimer()

  function walk(id: number, parent: string) {
    const entry = readDirectoryEntryInfo(cfb, id)
    if (entry.objectType === 2) {

      tempBuffer.resize(Number(entry.streamSize))
      // stream object
      const u8arr = readStreamObjectContent(
        cfb,
        Number(entry.startingSectorLocation),
        Number(entry.streamSize),
        tempU8Array,
      )
      const name = normalizeFileName(u8arr, entry.name)
      const file = new ZipDeflate(parent + '/' + name);
      zip.add(file)
      file.push(u8arr, true)

      ++totalFiles
      fileTimer.doIfPassed(()=>{
        send({type: 'file', file: totalFiles})
      }, {delta: 100, mark: true})

    }
    if (isEntryIDValid(entry.leftSiblingID)) {
      walk(entry.leftSiblingID, parent)
    }
    if (isEntryIDValid(entry.rightSiblingID)) {
      walk(entry.rightSiblingID, parent)
    }
    if (entry.objectType === 1 && isEntryIDValid(entry.childID)) {
      walk(entry.childID, parent+'/'+entry.name)
    }
  }
  const rootEntry = readDirectoryEntryInfo(cfb, 0)
  // root object is always storage
  walk(rootEntry.childID, "emotes")
  zip.end()
}

function isEntryIDValid(id: number) {
  return id >= 0 && id <= 0xFFFFFFFA
}