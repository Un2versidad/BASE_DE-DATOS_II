'use client'

import { Player } from '@remotion/player'
import { ResultsVideoComposition, getResultsVideoDuration } from './ResultsVideo'

interface ResultItem {
    name: string
    value: string
    unit: string
    reference: string
    status: 'normal' | 'high' | 'low'
}

interface ResultsPlayerProps {
    patientName: string
    examName: string
    examDate: string
    items: ResultItem[]
    doctorName?: string
}

export const ResultsPlayer = ({
    patientName,
    examName,
    examDate,
    items,
    doctorName
}: ResultsPlayerProps) => {
    const durationInFrames = getResultsVideoDuration(items.length)

    return (
        <div className="rounded-xl overflow-hidden shadow-2xl">
            <Player
                component={ResultsVideoComposition}
                inputProps={{
                    patientName,
                    examName,
                    examDate,
                    items,
                    doctorName
                }}
                durationInFrames={durationInFrames}
                fps={30}
                compositionWidth={1280}
                compositionHeight={720}
                style={{
                    width: '100%',
                    aspectRatio: '16/9',
                }}
                controls
                autoPlay={false}
                loop={false}
            />
        </div>
    )
}

export default ResultsPlayer
