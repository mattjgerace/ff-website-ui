function processResponse(response: Response) {
    switch (response.status) {
        case 401:
        case 403:
        case 200:
            return response.json()
        default:
            return response.json()
    }
}

class FFWebsiteAPI {
    headers!: { 'Content-Type': string;};
    apiHost!: string | undefined;
    ready!: Promise<unknown>;
    resolver!: (value: unknown) => void;

    constructor() {
        this.apiHost = process.env.VUE_APP_BASE_URL;
        this.headers = {'Content-Type': 'application/json'};
        this.ready = new Promise(resolve => {
            this.resolver = resolve;
        });
    }

    async #fetch(path: string, config={ headers: this.headers }) {
        await this.ready;
        return fetch(`${this.apiHost}/api/${path}`, config).then(processResponse);
    }

    async getSettings(season: string) {
        if (season=='Year:' || season=='All Time') {
            // TODO
            return this.#fetch(`season`)
        }
        else {
            return this.#fetch(`season/?season=${season}`)
        }
    }

    async getLeaderboard(season: string) {
        if (season=='Year:' || season=='All Time') {
            return this.#fetch(`leaderboard/all-time/?active=1`)
        }
        else {
            return this.#fetch(`leaderboard/?season_settings__season=${season}`)
        }
    }

    async getMatchups(season: string | null, lowerWeek: string | null, higherWeek: string | null, playoff: number | null) {
        let endpoint = `matchups/?`
        if (season != null) {
            endpoint += `season=${season}&`
        }
        if (lowerWeek != null) {
            if (Number(higherWeek) != 100) {
                endpoint += `lower_week=${lowerWeek}&higher_week=${higherWeek}&`
            }
            else {
                endpoint += `week=${lowerWeek}&`
            }
        }
        if (playoff != null) {
            endpoint += `playoff=${playoff}&`
        }
        endpoint = endpoint.substring(0, endpoint.length - 1);
        return this.#fetch(endpoint)

    }

    async getDraft(season: string) {
        if (season=='Year:' || season=='All Time') {
            return this.#fetch(`draft`)
        }
        else {
            return this.#fetch(`draft/?season_settings__season=${season}`)
        }
    }

    async getRecord(record: string) {
        switch(record) {
            case ("Top 50 Highest Single Game Scores"): { 
                return this.#fetch(`matchups/records/top-scores/`)
            }
            case ("Top 15 Points For Single Regular Season"): {
                return this.#fetch(`matchups/records/top-years/?playoff=False`)
            } 
            case ("Top 15 Points Per Game Single Regular Season"): {
                return this.#fetch(`matchups/records/top-years/?ppg=True&playoff=False`)
            }
            case ("Top 15 Points For Single Postseason Season"): {
                return this.#fetch(`matchups/records/top-years/?playoff=True`)
            } 
            case ("Top 15 Points Per Game Single Postseason Season"): {
                return this.#fetch(`matchups/records/top-years/?ppg=True&playoff=True`)
            }  
            default: {
              return null;
            }
        }
    }
    

}

const ffWebsiteAPI = new FFWebsiteAPI();

export default ffWebsiteAPI;