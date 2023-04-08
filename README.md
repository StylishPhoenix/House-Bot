# House Points Bot
A Discord bot that allows you to manage house points for a server. Users can add, remove, and view points for each house. This bot uses Discord.js v14 and slash commands.

# Features
Add points to a house

Remove points from a house

Add a specific amount of points to a house

Display the current points for each house

# Installation
Clone this repository

Run npm install to install the required dependencies.

Create a `config.json` file in the same folder as HouseBot.js.  The file should look like this
```
{
"token" : "INSERT_YOUR_TOKEN_HERE"
}
```
Edit the examplehouseChoices.json and the examplepointChoices.json files to fit your needs.  Rename these to houseChoices.json and pointChoices.json respectively.


# Usage
Run the bot using node housebot.js.

Available slash commands:

`/add_points`: Add points to a house based on predefined point choices

`/remove_points`: Remove a specific number of points from a house (restricted to users with ban member permissions)

`/add_point_amount`: Add a specific number of points to a house (restricted to users with ban member permissions)

`/points`: Display the current points for each house

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
