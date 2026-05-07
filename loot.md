### Pineapple Express Loot Web Application
1. ALWAYS ask me when executing code
2. DO NOT ASK to grep or bash commands
3. Always search for best possible answer and give me prompts if you don't know
4. Ask clarifying questions
5. use the best skills available: I.E. Superpowers, CSS skills, etc..
6. Comment code wherever and be thorough
7. Use code-reviewer skill as necessary

## Goals

1. Host Loot Table in my own web Application on my server - will give examples - no longer spreadsheet needed
2. Shows all loot available based on Softres.it API for each raid tier - will give exmaples - https://softres.it/api/{raidID} - example import **=ImportJSON("https://softres.it/api/raid/tu8jdg", "/_id,/raidId,/edition,/instance,/discord,/discordId,/reserved", "noInherit,noTruncate,noHeaders")
3. Host Loot Priority within another Tab in the web application - will give examples
4. Export Loot Priority from web app to Gargul in-game application in readable json format - https://www.curseforge.com/wow/addons/gargul
5. Export Gargul Loot wins, rolls etc... to Web application to populate tab that has all users loot win information in parsable format
6. Import list of users or able to create Users for Teams dynamically
7. Export Loot to ThatsMyBis https://thatsmybis.com/ - eventually host my own tab to my application to parse everything
8. Let me know if we should use CoWork to acces my google drive.
9. account for two nights each week of raiding
10. Make this publicly facing so anyone can access it for viewing, but allow an admin password or token to login to manage it
11. I will host this app on my webserver I want to be able to build it locally here and then transfer to host on my server

# stuff
1. Loot prio example https://docs.google.com/spreadsheets/d/1p3l_djFEmsmlyozl5cHKscndRacXZlBSJkV_5No_ULA/edit?gid=1854205406#gid=1854205406
2. soft reserve sheet example https://docs.google.com/spreadsheets/d/1eZynnlsx9OUmn5h3F7QuiBMoG7iNXluZUQYDd5DrIXs/edit?gid=1098721965#gid=1098721965
3. soft reserve.it example https://softres.it/raid/qdap8m - token=dinosaur686 (not sure if needed)
4. Gargul export example:
{charactername}-{server},{numberoflootwon}
feckful-galakras,0
oomkin-galakras,0
innomine-galakras,1
zanrian-galakras,1
ghoti-galakras,0
nierosham-galakras,0
fenel-galakras,0
bobbyknuckle-immerseus,1
snoozle-galakras,1
subushock-galakras,0
decliviam-galakras,0
coflabjr-galakras,0
zedd-galakras,0
slicendicins-nazgrim,0
centirooj-galakras,0
faptard-galakras,0
nattypandy-galakras,0
gradians-galakras,0
zipperzz-galakras,3
couchcoffin-galakras,0
halfbricked-galakras,0
leinad-galakras,0
doms-galakras,1
rello-galakras,1
guy-galakras,0
coflab-galakras,1
5. Each cahracter gets 2 reserves per week and we need to track how many reserves they have automatically each week.
6. List of our loot rules:
Soft Reserve System with a Well Made Class/Spec Loot Prio Sheet and Weighted Roll

This loot system is designed to eliminate Loot Council bias, bypass ineffective "point system gearing and hoarding", engage with some RNG, be fully transparent, and mostly effectively gear a raid team for progression with minimal error.
    
Loot Prio>2 Soft Reserve>MS>OS>+1 "Armor" and +1 Wep/Trinkets
You can win 1 MS armor item, 1 MS Wep/Trinket, 2 reserve, and whatever on OS unless nobody else contests your 2nd win in the same category.
Armor means all armor and non damage weapon slots (Shields/OH)

Note: Prio is designed for "realistic bis" in order to most effectively gear 25 players. It is never expected that each player will be 100% bis because that would mean other players are likely significantly less geared to achieve this. GDKP's or Splits are the only way to achieve 100% bis. We are not that.

Each reserve beyond the first adds 10x the number of weeks reserved to the previous week's roll to build an exponentially increasing weighted roll prio up to 6 weeks.

EX: add 10x the #of weeks reserved to the previous week's roll total.
 week 1= 1-100
 week 2= 20-120
 week 3= 50-150
 week 4= 90-190
 week 5= 140-240
 week 6= 200-300

Roll bonus caps at 6 weeks so the numbers don't go insane. Keep reserving as normal with both reserves. We have a cap to allow players, especially newer recruits, to catch up and have a chance at winning items as they spend more time in the team - a significant issue that hindered us in previous iterations.

A player's soft reserve and # of weeks ONLY counts if they have it CURRENTLY reserved for that week regardless of their previous number of weeks reserved. IE: Can't swap reserves and still roll on previous reserve.
[2:27 AM] 
APP
 Hydroflask: .
How Does this work?:
1: Players reserve 2 items on softres.it from all available bosses for soft res before 11:45pm on raid day. See softres.it in signups. NOTE: You may only reserve items from bosses your team has killed!
2: An item drops and officers check loot priority. They announce the loot prio for all eligible classes.
3: If any player within that prio has soft reserved that item, officers announce them and those players get first right to roll.
4: Players roll according to # of weeks reserved. GOOD LUCK and Gratz to the winner!
5: If no players have soft reserved that item or the soft reserve is by someone who doesn't have prio, The item is rolled MS according to prio.
