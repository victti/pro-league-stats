const { GetBayesGames, GetGameData } = require("./common");

const leagueNames = [];

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
            let { matchDetails, timelineDetails } = await GetGameData(entry.title);

            if(matchDetails == null || timelineDetails == null)
                continue;

            let winnerTeam = matchDetails.teams[0].win ? matchDetails.teams[0].teamId : matchDetails.teams[1].teamId
            let winnerGrubs = 0;
            let voidGrubs = [];

            if(matchDetails.teams[0].objectives.horde == undefined)
                continue;

            for(let team of matchDetails.teams)
            {
                if(team.teamId == winnerTeam)
                {
                    winnerGrubs = team.objectives.horde.kills;
                }
                voidGrubs.push({teamId: team.teamId, kills: team.objectives.horde.kills});
            }

            statistics.push({winnerTeam, winnerGrubs, voidGrubs});
        }
    }

    //#region Calculo de porcentagens
    let totalGamesSixGrub = 0;
    let totalGamesLeastFiveGrub = 0;
    let totalGamesFiveGrub = 0;
    let totalGamesFourGrub = 0;
    let totalGamesThreeGrub = 0;
    let totalGamesTwoGrub = 0;
    let totalGamesOneGrub = 0;
    let totalGamesZeroGrub = 0;

    let sixGrubWinCount = 0;
    let leastFiveGrubWinCount = 0;
    let fiveGrubWinCount = 0;
    let fourGrubWinCount = 0;
    let threeGrubWinCount = 0;
    let twoGrubWinCount = 0;
    let oneGrubWinCount = 0;
    let zeroGrubWinCount = 0;

    for(let game of statistics)
    {
        if(game.winnerGrubs == 6)
            sixGrubWinCount += 1;

        if(game.winnerGrubs >= 5)
            leastFiveGrubWinCount += 1;

        if(game.winnerGrubs == 5)
            fiveGrubWinCount += 1;

        if(game.winnerGrubs == 4)
            fourGrubWinCount += 1;

        if(game.winnerGrubs == 3)
            threeGrubWinCount += 1;

        if(game.winnerGrubs == 2)
            twoGrubWinCount += 1;

        if(game.winnerGrubs == 1)
            oneGrubWinCount += 1;

        if(game.winnerGrubs == 0)
            zeroGrubWinCount += 1;

        for(let grubs of game.voidGrubs)
        {
            if(grubs.kills == 6)
                totalGamesSixGrub += 1;

            if(grubs.kills >= 5)
                totalGamesLeastFiveGrub += 1;

            if(grubs.kills == 5)
                totalGamesFiveGrub += 1;

            if(grubs.kills == 4)
                totalGamesFourGrub += 1;

            if(grubs.kills == 3)
                totalGamesThreeGrub += 1;

            if(grubs.kills == 2)
                totalGamesTwoGrub += 1;

            if(grubs.kills == 1)
                totalGamesOneGrub += 1;

            if(grubs.kills == 0)
                totalGamesZeroGrub += 1;
        }
    }

    let sixGrubWinPercent = ((sixGrubWinCount / totalGamesSixGrub) * 100).toFixed(1);
    let leastFiveGrubWinPercent = ((leastFiveGrubWinCount / totalGamesLeastFiveGrub) * 100).toFixed(1);;
    let fiveGrubWinPercent = ((fiveGrubWinCount / totalGamesFiveGrub) * 100).toFixed(1);
    let fourGrubWinPercent = ((fourGrubWinCount / totalGamesFourGrub) * 100).toFixed(1);
    let threeGrubWinPercent = ((threeGrubWinCount / totalGamesThreeGrub) * 100).toFixed(1);
    let twoGrubWinPercent = ((twoGrubWinCount / totalGamesTwoGrub) * 100).toFixed(1);
    let oneGrubWinPercent = ((oneGrubWinCount / totalGamesOneGrub) * 100).toFixed(1);
    let zeroGrubWinPercent = ((zeroGrubWinCount / totalGamesZeroGrub) * 100).toFixed(1);

    sixGrubWinPercent = isNaN(sixGrubWinPercent) ? 0.0 : sixGrubWinPercent;
    leastFiveGrubWinPercent = isNaN(leastFiveGrubWinPercent) ? 0.0 : leastFiveGrubWinPercent;
    fiveGrubWinPercent = isNaN(fiveGrubWinPercent) ? 0.0 : fiveGrubWinPercent;
    fourGrubWinPercent = isNaN(fourGrubWinPercent) ? 0.0 : fourGrubWinPercent;
    threeGrubWinPercent = isNaN(threeGrubWinPercent) ? 0.0 : threeGrubWinPercent;
    twoGrubWinPercent = isNaN(twoGrubWinPercent) ? 0.0 : twoGrubWinPercent;
    oneGrubWinPercent = isNaN(oneGrubWinPercent) ? 0.0 : oneGrubWinPercent;
    zeroGrubWinPercent = isNaN(zeroGrubWinPercent) ? 0.0 : zeroGrubWinPercent;

    //#endregion

    console.log(`Dados relativos as seguintes ligas: ${leagueNames} | Total de jogos: ${statistics.length}`);
    console.log(`pelo menos 5 vastilarvas: ocorrências ${totalGamesLeastFiveGrub} | winrate ${leastFiveGrubWinPercent}%`);
    console.log(`6 vastilarvas: ocorrências ${totalGamesSixGrub} | winrate ${sixGrubWinPercent}%`);
    console.log(`5 vastilarvas: ocorrências ${totalGamesFiveGrub} | winrate ${fiveGrubWinPercent}%`);
    console.log(`4 vastilarvas: ocorrências ${totalGamesFourGrub} | winrate ${fourGrubWinPercent}%`);
    console.log(`3 vastilarvas: ocorrências ${totalGamesThreeGrub} | winrate ${threeGrubWinPercent}%`);
    console.log(`2 vastilarvas: ocorrências ${totalGamesTwoGrub} | winrate ${twoGrubWinPercent}%`);
    console.log(`1 vastilarvas: ocorrências ${totalGamesOneGrub} | winrate ${oneGrubWinPercent}%`);
    console.log(`0 vastilarvas: ocorrências ${totalGamesZeroGrub} | winrate ${zeroGrubWinPercent}%`);
}

EntryPoint();