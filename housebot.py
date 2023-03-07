import os
import discord
import interactions
from discord.ext import commands

# Initialize the bot
bot = interactions.Client(token="INSERT_TOKEN_HERE")

# Initialize house points. Change this depending on house names
house_points = {
    'Necromancer': 0,
    'Herbalist': 0,
    'Mesmer': 0,
    'Philosopher': 0
}

# Define slash commands to add and remove house points
@bot.command(
	name="add_points", 
	description="Adds points to a house",
	options = [
		interactions.Option(
			name="house",
			description="House name here",
			type=interactions.OptionType.STRING,
			required=True,
# List houses here
			choices=[interactions.Choice(name="Necromancer", value="Necromancer"), interactions.Choice(name="Herbalist", value="Herbalist"), interactions.Choice(name="Mesmer", value="Mesmer"), interactions.Choice(name="Philosopher", value="Philosopher")],
		),
		interactions.Option(
			name="points",
			description="Points here",
			type=interactions.OptionType.INTEGER,
			required=True,
# Insert Choices for the bot here.  Please use a unique value, then add it to the nested ifs below
			choices=[interactions.Choice(name="Pinging the mods/Modmail", value=1), interactions.Choice(name="Invite friends to the server", value=2), interactions.Choice(name="Participate in events", value=3), interactions.Choice(name="Boost the server", value=4), interactions.Choice(name="Bump the server", value=5), interactions.Choice(name="Welcome new people", value=6), interactions.Choice(name="Posting Memes", value=7), interactions.Choice(name="Host events", value=8), interactions.Choice(name="Donate to the server", value=9)],
		),
	],
)
async def add_points(ctx: interactions.CommandContext, house: str, points: int):
    global house_points
    
    if house not in house_points:
        await ctx.send(f'Invalid house name: {house}')
        return 
    if points == 1:
               points = 50
    elif points == 2:
               points = 100
    elif points == 3:
               points = 100
    elif points == 4:
               points = 100
    elif points == 5:
               points = 100
    elif points == 6:
               points = 100
    elif points == 7:
               points = 100
    elif points == 8:
               points = 1000
    elif points == 9:
               points = 2000
    house_points[house] += points
    await ctx.send(f'{points} points added to {house}.')
    save_points()

@bot.command(
	name="remove_points", 
	description="Removes points from a house",
	default_member_permissions=interactions.Permissions.ADMINISTRATOR,
	options = [
		interactions.Option(
			name="house",
			description="House name here",
			type=interactions.OptionType.STRING,
			required=True,
# List houses here
			choices=[interactions.Choice(name="Necromancer", value="Necromancer"), interactions.Choice(name="Herbalist", value="Herbalist"), interactions.Choice(name="Mesmer", value="Mesmer"), interactions.Choice(name="Philosopher", value="Philosopher")],
		),
		interactions.Option(
			name="points",
			description="Points here",
			type=interactions.OptionType.INTEGER,
			required=True,
		),
	],
)
async def remove_points(ctx: interactions.CommandContext, house: str, points: int):
    global house_points
    
    if house not in house_points:
        await ctx.send(f'Invalid house name: {house}')
        return

    house_points[house] -= points
    await ctx.send(f'{points} points removed from {house}.')
    save_points()

@bot.command(
	name="add_point_amount", 
	description="Adds a certain amount of point from a house",
	default_member_permissions=interactions.Permissions.ADMINISTRATOR,
	options = [
		interactions.Option(
			name="house",
			description="House name here",
			type=interactions.OptionType.STRING,
			required=True,
# List houses here
			choices=[interactions.Choice(name="Necromancer", value="Necromancer"), interactions.Choice(name="Herbalist", value="Herbalist"), interactions.Choice(name="Mesmer", value="Mesmer"), interactions.Choice(name="Philosopher", value="Philosopher")],
		),
		interactions.Option(
			name="points",
			description="Points here",
			type=interactions.OptionType.INTEGER,
			required=True,
		),
	],
)
async def add_point_amount(ctx: interactions.CommandContext, house: str, points: int):
    global house_points
    
    if house not in house_points:
        await ctx.send(f'Invalid house name: {house}')
        return

    house_points[house] += points
    await ctx.send(f'{points} points added to {house}.')
    save_points()

# Define a slash command to display the current house points
@bot.command(name="points", description="Displays the current house points")
async def show_points(ctx: interactions.CommandContext):
    global house_points
    
    message = 'Current house points:\n'
    for house, points in house_points.items():
        message += f'{house}: {points}\n'
    
    await ctx.send(message)

# Define a function to save the house points to a text file
def save_points():
    with open('house_points.txt', 'w') as f:
        for house, points in house_points.items():
            f.write(f'{house}:{points}\n')

# Load the house points from the text file
def load_points():
    global house_points
    if os.path.exists('house_points.txt'):
        with open('house_points.txt', 'r') as f:
            for line in f:
                house, points = line.strip().split(':')
                house_points[house] = int(points)

# Load the house points when the bot starts up
@bot.event
async def on_ready():
    print(f'Bot has connected to Discord!')
    load_points()

# Save the house points when the bot shuts down
@bot.event
async def on_disconnect():
    print('Saving house points...')
    save_points()

# Run the bot
bot.start()
