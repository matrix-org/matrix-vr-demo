* demo clients only 1:1
* demo clients only vc
* demo + riot web for 1:1
* demo + riot web for 1:1 and/or vc
* conf room doesn't exist and demo client user creates and joins
* conf room exists and demo client user joins
* conf room exists and demo client user is already a member
* 1:1 peer already in a room with demo client
* demo client creates room and invites 1:1 peer
* conf room contains no other users
* conf room contains other users
* a user joins a conf room during vc
* a user hangs up during vc
* a user leaves during vc and vc is restarted (I think there's a bug here as I get the member list on conf obj construction)
* a user hangs up during vc and then calls back the demo user
* a user hangs up during 1:1
* a user hangs up during 1:1 and calls back
* combinations of new/existing anonymous 'guest' on conf.matrix.org and existing federated accounts
* generating a room alias and using a room alias from a link
