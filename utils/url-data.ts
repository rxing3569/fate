export function encodeData(data: any): string {
    const json = JSON.stringify(data)
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode(parseInt(p1, 16))
        }))
}

export function decodeData(encoded: string): any {
    try {
        const json = decodeURIComponent(atob(encoded).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        return JSON.parse(json)
    } catch (e) {
        console.error('Failed to decode data', e)
        return null
    }
}
