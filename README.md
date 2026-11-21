# Lambchat / Chatview
Multi-stream chat aggregator.  
This is the chat panel I use for my streams, there are a fair number of hardcoded constants so you will want to comb through on your own for them.  
src/providers contains the implementations for individual chat platforms. src/index.ts loads all of the providers, remove the ones you don't need.  
See [index.html](index.html) for more information on how to configure it.
  
Tenative list of supported platforms:
- Owncast
- XMPP
- IRC (via IRCoWS)
- Twitch (read only, via IRCoWS)
- RobotStreamer
- Anything supported by [Sheepchat](https://sheep.chat/en/) (hence the name/working title "lambchat"), namely Youtube. (read only)