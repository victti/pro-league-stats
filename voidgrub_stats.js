String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
}

const bayesSearchAPI = "https://lol.fandom.com/api.php?action=cargoquery&format=json&limit=max&tables=MatchScheduleGame%3DMSG%2C%20MatchSchedule%3DMS&fields=RiotPlatformGameId%2C%20Blue%2C%20Red%2C%20DateTime_UTC&where={0}&join_on=MSG.MatchId%3DMS.MatchId&order_by=MS.DateTime_UTC%20ASC";
const bayesGameAPI = "https://lol.fandom.com/api.php?action=query&format=json&prop=revisions&titles=V5%20data%3A{0}%7CV5%20data%3A{0}%2FTimeline&rvprop=content&rvslots=main";
 
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

            let bayesGame = await GetBayersGame(entry.title.RiotPlatformGameId);

            let matchDetails = null;
            let timelineDetails = null;

            for(let pageNum in bayesGame.query.pages)
            {
                let page = bayesGame.query.pages[pageNum];

                if(page.title.includes("Timeline"))
                {
                    timelineDetails =  page.revisions != undefined ? JSON.parse(page.revisions[0].slots.main["*"]) : null;
                    continue;
                }

                matchDetails = page.revisions != undefined ? JSON.parse(page.revisions[0].slots.main["*"]) : null;
            }

            if(matchDetails == null || timelineDetails == null)
                continue;

            let winnerTeam = matchDetails.teams[0].win ? matchDetails.teams[0].teamId : matchDetails.teams[1].teamId
            let winnerGrubs = 0;
            let voidGrubs = [];

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

    console.log("Dados relativos as seguintes ligas: {0} | Total de jogos: {1}".format(leagueNames, statistics.length));
    console.log("pelo menos 5 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesLeastFiveGrub, leastFiveGrubWinPercent));
    console.log("6 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesSixGrub, sixGrubWinPercent));
    console.log("5 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesFiveGrub, fiveGrubWinPercent));
    console.log("4 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesFourGrub, fourGrubWinPercent));
    console.log("3 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesThreeGrub, threeGrubWinPercent));
    console.log("2 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesTwoGrub, twoGrubWinPercent));
    console.log("1 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesOneGrub, oneGrubWinPercent));
    console.log("0 vastilarvas: ocorrências {0} | winrate {1}%".format(totalGamesZeroGrub, zeroGrubWinPercent));
}

async function GetBayesGames(leagueName, year)
{
    let leaguepediaLeagueName = leagueName.toUpperCase();
    let query = "{0}/{1}%";

    switch(leagueName)
    {
        case "LPL":
        case "WORLDS":
            query = "{0} {1}%";
            break;
        case "MSI":
            leaguepediaLeagueName = "Mid-Season Invitational";
            query = "{1} {0}%";
            break;
    }

    query = query.format(leaguepediaLeagueName, year);

    let where = "MSG.OverviewPage LIKE '{0}'".format(query);

    return await fetch(bayesSearchAPI.format(where), {}).then(resp => resp.json());
}

async function GetBayersGame(RiotGameID)
{
    return await fetch(bayesGameAPI.format(RiotGameID), {}).then(resp => resp.json());
}

EntryPoint();