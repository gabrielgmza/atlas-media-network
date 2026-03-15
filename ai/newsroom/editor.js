class EditorAI {

    decideTopic(trend) {

        const impactScore = Math.floor(Math.random() * 100)

        if (impactScore > 60) {
            return {
                publish: true,
                score: impactScore
            }
        }

        return {
            publish: false,
            score: impactScore
        }

    }

}

module.exports = EditorAI
