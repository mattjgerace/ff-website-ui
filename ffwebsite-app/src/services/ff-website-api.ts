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

    processResponse(response: Response) {
        switch (response.status) {
            case 200:
                return response.json()
            case 201:
                return response.json()
            case 503: {
                const error: any = new Error('Service Unavailable');
                error.status = 503;
                throw error;
            }
            default:
                if (!response.ok) {
                    throw new Error('Request failed');
                }
                return response.json();
            }
        }

    async #fetch(path: string, config={ headers: this.headers }) {
        await this.ready;
        try{
            return fetch(`${this.apiHost}/api/${path}`, config).then(this.processResponse);
        }
        catch(err: any) {
            if (err.status === 503) {
                return this.retry(() => fetch(`${this.apiHost}/api/${path}`, config).then(this.processResponse))
            }
            else {
            // real error → stop
            }
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async retry(request: () => Promise<Response>, maxRetries = 5, delayMs = 1000): Promise<any> {
        try {
            await this.delay(delayMs);
            return request;
          } catch (err: any) {
            if (maxRetries <= 0) {
              console.error("Max retries exceeded, throwing error:", err);
              throw err;
            }
            console.log(`Attempt failed. Retrying in ${delayMs}ms... (Tries left: ${maxRetries})`);
            return this.retry(request, maxRetries - 1, delayMs);
          }
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