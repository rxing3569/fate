export const MUTAGEN_LABELS = ['祿', '權', '科', '忌']

export function getStarMutagens(star, activeHoroscope) {
    const badges = []

    // 1. Natal
    if (star.mutagen) {
        badges.push({ label: star.mutagen, class: 'mutagen-natal' })
    }

    if (!activeHoroscope) return badges

    // 2. Decadal
    if (activeHoroscope.decadal && activeHoroscope.decadal.mutagen) {
        const index = activeHoroscope.decadal.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `大${MUTAGEN_LABELS[index]}`, class: 'mutagen-decadal' })
        }
    }

    // 3. Yearly
    if (activeHoroscope.yearly && activeHoroscope.yearly.mutagen) {
        const index = activeHoroscope.yearly.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `流${MUTAGEN_LABELS[index]}`, class: 'mutagen-yearly' })
        }
    }

    // 4. Monthly
    if (activeHoroscope.monthly && activeHoroscope.monthly.mutagen) {
        const index = activeHoroscope.monthly.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `月${MUTAGEN_LABELS[index]}`, class: 'mutagen-monthly' })
        }
    }

    // 5. Daily
    if (activeHoroscope.daily && activeHoroscope.daily.mutagen) {
        const index = activeHoroscope.daily.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `日${MUTAGEN_LABELS[index]}`, class: 'mutagen-daily' })
        }
    }

    return badges
}
