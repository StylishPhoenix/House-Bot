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
```pip install discord interactions```
# Configuring the Bot
# House Names
The bot is initialized with a dictionary of house points. You can modify this dictionary to add or remove houses or change the names of the houses.

To modify the house names, change the keys of the house_points dictionary in the code. For example, if you wanted to add a new house named "Wizard", you would add the following line to the dictionary:
```
house_points['Wizard'] = 0
```
To remove a house, simply remove its key from the dictionary. For example, if you wanted to remove the "Philosopher" house, you would remove the following line from the dictionary:

```
'Philosopher': 0,
```
# Point Values
In the /add_points command, the point values for each option are defined using nested if statements. You can modify these values to assign different point values to each option.

To modify the point values, change the values of the choices parameter for the points option in the /add_points command. For example, if you wanted to increase the point value for "Bump the server" to 150, you would change the following line:

```
interactions.Choice(name="Bump the server", value=5),
```
to:

```
interactions.Choice(name="Bump the server", value=150),
```
# Permissions
In the /remove_points and /add_point_amount commands, the user must have administrative permissions to use these commands. You can modify the default_member_permissions parameter in the /remove_points and /add_point_amount commands to change the required permissions for these commands.

For example, if you wanted to allow users with the "Moderator" role to use these commands, you would change the following line:

```
default_member_permissions=interactions.Permissions.ADMINISTRATOR,
```
to:

```
default_member_permissions=interactions.Permissions(role=["Moderator"]),
```
# Running the Bot
To run the bot, simply run the housebot.py file using Python:

```
python housebot.py
```
The bot will start up and connect to Discord. You can use the commands in Discord by typing `/command` in the chat, where command is the name of the command you want to use.

When you shut down the bot, it will save the current point values to a text file named house_points.txt. When you start up the bot again, it will load the point values from this file. If the file does not exist, the bot will start with all house point values set to 0.
