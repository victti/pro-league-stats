const { GetBayesGames, GetGameData } = require("./common");

const leagueNames = ["CBLOL"];

async function EntryPoint()
{
    let statistics = {};

    for(let league of leagueNames)
    {
        let bayesGames = await GetBayesGames(league, "2024");

        if(bayesGames.cargoquery == undefined)
            break;

        for(let entry of bayesGames.cargoquery)
        {
            let { matchDetails, timelineDetails } = await GetGameData(entry.title);

            if(matchDetails == null || timelineDetails == null)
                continue;

            for(let participant of matchDetails.participants)
            {
                if(participant.challenges == undefined)
                    continue;

                if(participant.challenges.epicMonsterSteals == 0)
                    continue;

                if(statistics[participant.riotIdGameName] == undefined)
                    statistics[participant.riotIdGameName] = { name: participant.riotIdGameName, epicMonsterSteals: 0 };

                statistics[participant.riotIdGameName].steals += participant.challenges.epicMonsterSteals;
            }
        }
    }

    //#region

    statistics = Object.values(statistics);
    statistics.sort((a, b) => b.steals - a.steals);

    //#endregion

    console.log(statistics);
}

EntryPoint();