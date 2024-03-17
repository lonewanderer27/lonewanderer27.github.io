---
# layout: post
title: Making Camp Buddy Toolbox using PySimpleGUI
image_source: "RealPython"
heroImage: /images/blog/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui/Get-Started-with-PySimpleGUI_Watermarked.webp
description: I made an AI talk like a character in my favorite Visual Novel!
image_source_url: "https://realpython.com/pysimplegui-python"
tags: [code]
pubDate: 2022-06-09
author: jay
---

I once wanted to create a Discord chatbot that speaks exactly like Keitaro, however, none have written a dialog extractor specifically for Camp Buddy, so I wrote [Camp Buddy Dialog Extractor](https://github.com/lonewanderer27/Camp-Buddy-Dialog-Extractor)

However, that program is a command line application, meaning a user would have to know how to use a terminal which is not very user friendly... What if someone who's inexperienced in coding just wants to have fun with their friends, talking to Keitaro or Hiro in their Discord server, like I once wanted...

So I thought to myself.. why not make an app that can extract scripts from Camp Buddy? (and more that I can think of in the future)

![](/images/blog/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui/Screenshot_Extract_Dialogs_Tab.png)

Sooooooo above me is a screenshot of the tool that I'm currently making for a Visual Novel game. It mainly targets those who want to make a python chat bot that speaks exactly like the characters from the Visual Novel.

### Extracting Assets Tab

![](/images/blog/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui/172808192-31553218-949d-432a-a740-68266242f98a.png)

The GUI doesn't become unresponsive thanks to perform_long_operation. And the write_event_value made it easy to pass the current file that is being extracted, as well as the current progress of the extraction from a separate python program

![](/images/blog/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui/172815391-6f95e611-3f80-4875-a586-baf5aae3d6a3.gif)

Though I kinda wish this also works in the QT port as I prefer the look of that instead of Tkinter. But this will do for now!


### Extracting Scripts Tab

The layout tools worked very well in keeping the check boxes organized

![](/images/blog/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui/172815459-afddc0de-7ac3-4be4-9d96-76cfe86529dc.gif)



### About Window

I really like the About window of GNOME / GTK apps so I made mine look similar to it

![](/images/blog/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui/172815544-67924be4-00f8-4016-a34e-a96c6b82a200.gif)



The Github Repo link is here for anyone who wants to look at the code, warning it's spaghetti code:
[https://github.com/lonewanderer27/Camp-Buddy-Toolbox](https://github.com/lonewanderer27/Camp-Buddy-Toolbox)

And I am legally required to disclose the code anyway since I used and modified (a bit) the code of the extractor program (which is GPL-3 licensed)