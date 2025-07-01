const key = process.env.STEAM_API_KEY

type App = {
    appid: number
    name: string
}

async function main() {
    if (!key) {
        console.error("STEAM_API_KEY is not set in the environment variables.")
        return
    }

    let lastAppId = 0
    let haveMore = true

    let apps: App[] = []

    while (haveMore) {
        let tries = 0
        while (tries < 5) {
            try {
                const applist = await getAppList(lastAppId)
                lastAppId = applist.lastAppId
                haveMore = applist.haveMore

                apps = apps.concat(applist.apps)
                break
            } catch (error) {
                tries++
                console.error("Error fetching app list:", error)
                console.log("Retrying in 5 seconds...")
                await new Promise(resolve => setTimeout(resolve, 5000))
            }
        }

        if (tries === 5) {
            console.error("Failed to fetch app list after 5 attempts. Exiting.")
            return
        }

        console.log(`Fetched ${apps.length} apps so far... Last App ID: ${lastAppId}`)
    }

    console.log(`Total apps fetched: ${apps.length}`)
    Bun.write("data/apps.json", JSON.stringify(apps))
}

async function getAppList(last: number): Promise<{ apps: App[], lastAppId: number, haveMore: boolean }> {
    const res = await fetch(`https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${key}&include_games=true&max_results=50000&last_appid=${last}`)
    if (!res.ok) {
        throw new Error(`Failed to fetch app list: ${res.status} ${res.statusText}`)
    }

    const data: any = await res.json()
    if (!data || !data.response || !data.response.apps) {
        throw new Error("Invalid response format from Steam API")
    }

    return {
        apps: data.response.apps.map((app: any) => ({
            appid: app.appid,
            name: app.name
        })),
        lastAppId: data.response.last_appid,
        haveMore: data.response.have_more_results
    }
}

main()
