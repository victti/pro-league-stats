String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
}

const bayesSearchAPI = "https://lol.fandom.com/api.php?action=cargoquery&format=json&limit=max&tables=MatchScheduleGame%3DMSG%2C%20MatchSchedule%3DMS&fields=RiotPlatformGameId%2C%20Blue%2C%20Red%2C%20DateTime_UTC&where={0}&join_on=MSG.MatchId%3DMS.MatchId&order_by=MS.DateTime_UTC%20ASC";
const bayesGameAPI = "https://lol.fandom.com/api.php?action=query&format=json&prop=revisions&titles=V5%20data%3A{0}%7CV5%20data%3A{0}%2FTimeline&rvprop=content&rvslots=main";
 
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

function fmtMSS(s){return(s-(s%=60))/60+(9<s?':':':0')+s}

function nFormatter(num, digits) {
    var si = [
      { value: 1, symbol: "" },
      { value: 1E3, symbol: "K" },
      { value: 1E6, symbol: "M" },
      { value: 1E9, symbol: "G" },
      { value: 1E12, symbol: "T" },
      { value: 1E15, symbol: "P" },
      { value: 1E18, symbol: "E" }
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    // for negative value is work
    for (i = si.length - 1; i > 0; i--) {
      if (Math.abs(num) >= si[i].value) {
        break;
      }
    }
    return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

module.exports = { GetBayesGames, GetBayersGame, fmtMSS, nFormatter }