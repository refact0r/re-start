const CACHE_KEY = 'quotes_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const QUOTES = [
    // Steve Jobs
    { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { content: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { content: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { content: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { content: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
    { content: "Be a yardstick of quality. Some people aren't used to an environment where excellence is expected.", author: "Steve Jobs" },
    { content: "Simple can be harder than complex. You have to work hard to get your thinking clean to make it simple.", author: "Steve Jobs" },
    { content: "Have the courage to follow your heart and intuition.", author: "Steve Jobs" },
    { content: "Quality is more important than quantity. One home run is much better than two doubles.", author: "Steve Jobs" },
    // Paul Graham
    { content: "It's hard to do a really good job on anything you don't think about in the shower.", author: "Paul Graham" },
    { content: "The way to get startup ideas is not to try to think of startup ideas.", author: "Paul Graham" },
    { content: "Make something people want.", author: "Paul Graham" },
    { content: "Live in the future, then build what's missing.", author: "Paul Graham" },
    { content: "The best way to predict the future is to create it.", author: "Paul Graham" },
    { content: "Do things that don't scale.", author: "Paul Graham" },
    // Elon Musk
    { content: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
    { content: "Failure is an option here. If things are not failing, you are not innovating enough.", author: "Elon Musk" },
    { content: "I think it's possible for ordinary people to choose to be extraordinary.", author: "Elon Musk" },
    { content: "Constantly think about how you could be doing things better.", author: "Elon Musk" },
    // Marc Andreessen
    { content: "Software is eating the world.", author: "Marc Andreessen" },
    { content: "The best way to understand entrepreneurship is to do it.", author: "Marc Andreessen" },
    { content: "In a fight between a bear and an alligator, it's the terrain that determines the winner.", author: "Marc Andreessen" },
    // Sam Altman
    { content: "Great execution is at least 10 times more important than a great idea.", author: "Sam Altman" },
    { content: "Work on something that matters to you more than money.", author: "Sam Altman" },
    { content: "Move fast. Speed is one of your main advantages over large companies.", author: "Sam Altman" },
    // Peter Thiel
    { content: "Competition is for losers.", author: "Peter Thiel" },
    { content: "What important truth do very few people agree with you on?", author: "Peter Thiel" },
    { content: "Brilliant thinking is rare, but courage is in even shorter supply.", author: "Peter Thiel" },
    // Jeff Bezos
    { content: "If you double the number of experiments you do per year, you're going to double your inventiveness.", author: "Jeff Bezos" },
    { content: "Your brand is what people say about you when you're not in the room.", author: "Jeff Bezos" },
    { content: "Work hard, have fun, make history.", author: "Jeff Bezos" },
    // Others
    { content: "Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.", author: "Mark Zuckerberg" },
    { content: "Ideas are easy. Implementation is hard.", author: "Guy Kawasaki" },
    { content: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
    { content: "If you're not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman" },
    { content: "Done is better than perfect.", author: "Sheryl Sandberg" },
    { content: "The best minds of my generation are thinking about how to make people click ads.", author: "Jeff Hammerbacher" },
]

export class QuotesAPI {
    getCachedQuote() {
        try {
            const cached = localStorage.getItem(CACHE_KEY)
            if (cached) {
                const { quote, timestamp } = JSON.parse(cached)
                const isStale = Date.now() - timestamp > CACHE_DURATION
                return { quote, isStale }
            }
        } catch (error) {
            console.error('failed to get cached quote:', error)
        }
        return { quote: null, isStale: true }
    }

    cacheQuote(quote) {
        try {
            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    quote,
                    timestamp: Date.now(),
                })
            )
        } catch (error) {
            console.error('failed to cache quote:', error)
        }
    }

    clearCache() {
        localStorage.removeItem(CACHE_KEY)
    }

    getRandomQuote() {
        const index = Math.floor(Math.random() * QUOTES.length)
        return QUOTES[index]
    }

    async getQuote() {
        // Check cache first
        const { quote: cachedQuote, isStale } = this.getCachedQuote()

        if (cachedQuote && !isStale) {
            return cachedQuote
        }

        // Get a new random quote
        const quote = this.getRandomQuote()
        this.cacheQuote(quote)
        return quote
    }
}

export default QuotesAPI
