import { readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync('../lib/core/ziwei/ziwei_star_descriptions.dart', 'utf8')

function section(name, nextName) {
  const start = source.indexOf(` ${name} = {`)
  const end = nextName ? source.indexOf(` ${nextName} = {`, start) : source.length
  return source.slice(start, end)
}

function flatMap(name, nextName) {
  const result = {}
  for (const line of section(name, nextName).split('\n')) {
    const match = line.match(/^\s*'([^']+)':\s*'([^']*)',?$/)
    if (match) result[match[1]] = match[2]
  }
  return result
}

const major = {}
let current = ''
for (const line of section('majorStarDescriptions', 'minorStarDescriptions').split('\n')) {
  const star = line.match(/^\s{4}'([^']+)': \{$/)
  if (star) { current = star[1]; major[current] = {}; continue }
  const palace = line.match(/^\s{6}'([^']+)':\s*'([^']*)',?$/)
  if (current && palace) major[current][palace[1]] = palace[2]
}

writeFileSync('data/star-descriptions.json', JSON.stringify({
  major,
  minor: flatMap('minorStarDescriptions', 'siHuaDescriptions'),
  siHua: flatMap('siHuaDescriptions', 'god12Descriptions'),
  gods: flatMap('god12Descriptions'),
}, null, 2) + '\n')
