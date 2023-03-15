# House-Bot
This is a Discord bot written in Python using the discord and interactions modules to manage house points for a server with multiple houses. The bot supports the following commands:

/add_points: adds points to a specific house based on a predefined list of options. The user selects the house and the point value from a dropdown list.
/remove_points: removes points from a specific house. This command is only available to users with administrative permissions.
/add_point_amount: adds a custom amount of points to a specific house. This command is only available to users with administrative permissions.
/points: displays the current point values for all houses.
The bot also saves the current point values to a text file when it shuts down and loads them from the file when it starts up.

# Getting Started
To use this bot, you will need to create a Discord bot account and obtain a token for the bot. You can follow the instructions in this tutorial to create a bot account and get a token.

Once you have the token, replace INSERT_TOKEN_HERE in the code with your token.

You will also need to install the discord and interactions modules. You can do this using pip:
