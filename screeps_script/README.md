# RaymondKevin's Personal Screeps' Script and Other Tools

## Introduction
- Script
    - Acknowledgement:
        - I use the module *Traveler.js* to improve the movement behaviors of creeps.
        - I use the shared module *prototype.Room.structures* from Slack to improve the effiency of accessing the structures.
        - I use the *profiler* module to test the efficiency and track the tick usage.
        - I get some inspirations from the *task-system* of the ***OVERMIND***.
- Automatic Market
    - Acknowledgement:
        - I adjust the package *screepsapi* to fit for the purpose of market-orientation.

## Requirement
- You need to design the layout by yourself.

## Log
- 2020.05.03 Basically finish the 2.0.0 version of script.
    - Features
        - Fully depends on the **task** system.
        - Heavily depends on the **configuration**, which means both manual and easy-to-operate.
        - Pseudo-automatic terminal behavior (*rely on the configuration*).
        - Pseudo-automatic factory/lab behavior (*rely on the configuration*).
        - Pseudo-automatic resources detection behavior (*rely on the configuration*).