import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

function bytesToSize(bytes: number) {
    if (bytes === 0) return '0 B'

    const k = 1024

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

function downloadCsv(header: any, data: any[], fileName: string) {
    if (!header || !Array.isArray(header) || !Array.isArray(data) || !header.length) {
        return
    }
    let csvContent = 'data:text/csv;charset=utf-8,\ufeff'
    const _header = header.map(h => h.title).join(',')
    const keys = header.map(item => item.key)
    csvContent += _header + '\n'
    data.forEach((item, index) => {
        let dataString = ''
        for (let i = 0; i < keys.length; i++) {
            dataString += item[keys[i]] + ','
        }
        csvContent += index < data.length ? dataString.replace(/,$/, '\n') : dataString.replace(/,$/, '')
    })
    const a = document.createElement('a')
    a.href = encodeURI(csvContent)
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(csvContent)
}

const urlJoin = (...args: string[]) =>
    args
        .join('/')
        .replace(/[\/]+/g, '/')
        .replace(/^(.+):\//, '$1://')
        .replace(/^file:/, 'file:/')
        .replace(/\/(\?|&|#[^!])/g, '$1')
        .replace(/\?/g, '&')
        .replace('&', '?')

function createEnum(definition: any) {
    const strToValueMap: any = {}
    const numToDescMap: any = {}
    for (const enumName of Object.keys(definition)) {
        const [value, desc] = definition[enumName]
        strToValueMap[enumName] = value
        numToDescMap[value] = desc
    }
    return {
        ...strToValueMap,
        getDesc(enumName: any) {
            return (definition[enumName] && definition[enumName][1]) || ''
        },
        getDescFromValue(value: any) {
            return numToDescMap[value] || ''
        }
    }
}

function fromNow(t: string) {
    dayjs.extend(relativeTime)
    return dayjs(t).fromNow()
}

function formatDate(t: string) {
    return dayjs(t).format('YYYY.MM.DD')
}

function formatDateTime(t: string) {
    return dayjs(t).format('YYYY-MM-DD HH:mm:ss')
}

export {
    bytesToSize,
    downloadCsv,
    urlJoin,
    createEnum,
    fromNow,
    formatDate,
    formatDateTime
}
