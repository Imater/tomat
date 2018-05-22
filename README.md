# zaetomat

**Add task by timer from terminal console to Toggl and Slack.**

### Install zaetomat via npm

```bash
$ npm install zaetomat -g
```

Set token for Toggl and Slack. Instruction on first start.

```bash
$ zaetomat
```

## Usage

Add task right now:

```bash
$ zaetomat -t -30 -n 'CSSSR-XXX taskname'
```

Add task after 30 minutes of timer:

```bash
$ zaetomat -t 30 -n 'CSSSR-XXX taskname'
```

Add Dinner for 60 minutes and say about it in Slack channel #kitchen:

```bash
$ zaetomat -t 60 -k 'kitchen'
```

