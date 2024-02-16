const { GetBayesGames, GetBayersGame } = require("./common");

const leagueNames = ["CBLOL"];

async function EntryPoint()
{
    let statistics = [];

    for(let league of leagueNames)
    {
        let bayesGames = await GetBayesGames(league, "2024");

        if(bayesGames.cargoquery == undefined)
            break;

        for(let entry of bayesGames.cargoquery)
        {
            if(entry.title.RiotPlatformGameId == null)
                continue;

            let { matchDetails, timelineDetails } = await GetBayersGame(entry.title.RiotPlatformGameId);

            if(matchDetails == null || timelineDetails == null)
                continue;

            let winnerTeam = matchDetails.teams[0].win ? matchDetails.teams[0].teamId : matchDetails.teams[1].teamId
            
            let gameDragons = {blue: [], red: []}

            for(let frame of timelineDetails.frames)
            {
                for(let event of frame.events)
                {
                    if(event.type != "ELITE_MONSTER_KILL" || event.monsterType != "DRAGON")
                        continue;

                    gameDragons[event.killerTeamId == 100 ? "blue" : "red"].push(event);
                }
            }

            if(gameDragons.blue.length >= 4 && !gameDragons.blue[3].monsterSubType.includes("ELDER"))
            {
                statistics.push({winnerTeam, killerTeamId: 100, monsterSubType: gameDragons.blue[3].monsterSubType});
            } else if(gameDragons.red.length >= 4 && !gameDragons.red[3].monsterSubType.includes("ELDER"))
            {
                statistics.push({winnerTeam, killerTeamId: 200, monsterSubType: gameDragons.red[3].monsterSubType});
            }
        }
    }

    //#region Calculo de porcentagens
    let stats = {};

    for(let stat of statistics)
    {
        let drakeType = stat.monsterSubType.split("_")[0];

        if(stats[drakeType] == undefined)
        {
            stats[drakeType] = { wins: 0, games: 0, winrate: 0 };
        }

        stats[drakeType].wins += stat.winnerTeam == stat.killerTeamId ? 1 : 0;
        stats[drakeType].games += 1;
    }

    for(let stat in stats)
    {
        stats[stat].winrate = ((stats[stat].wins / stats[stat].games) * 100).toFixed(1);
        stats[stat].winrate = isNaN(stats[stat].winrate) ? 0 : stats[stat].winrate;
        stats[stat].winrate = stats[stat].winrate + "%";
    }

    //#endregion

    console.log(stats);
}

EntryPoint();