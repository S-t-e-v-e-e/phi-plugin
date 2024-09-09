import plugin from '../../../lib/plugins/plugin.js';
import Config from '../components/Config.js';
import send from '../model/send.js';
import atlas from '../model/picmodle.js';
import getBackup from '../model/getBackup.js';
import fs from 'node:fs';
import { backupPath } from '../model/path.js';
import path from 'node:path';
import fCompute from '../model/fCompute.js';
import getRksRank from '../model/getRksRank.js';
import getSave from '../model/getSave.js';
import { redisPath } from '../model/constNum.js';

let banSetting = ["help", "bind", "b19", "wb19", "song", "ranklist", "fnc", "tipgame", "guessgame", "ltrgame", "sign", "setting", "dan"]

export class phiset extends plugin {
    constructor() {
        super({
            name: 'phi-setting',
            dsc: 'phigros屁股肉设置',
            event: 'message',
            priority: 1000,
            rule: [
                // {
                //     reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})(\\s*)(禁用|ban).*$`,
                //     fnc: 'ban'
                // },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*repu$`,
                    fnc: 'restartpu'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*backup(\\s*back)?$`,
                    fnc: 'backup'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*restore$`,
                    fnc: 'restore'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*get .*$`,
                    fnc: 'get'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*del .*$`,
                    fnc: 'del'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*allow .*$`,
                    fnc: 'allow'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*ban .*$`,
                    fnc: 'ban'
                },
                {
                    reg: `^[#/](${Config.getUserCfg('config', 'cmdhead')})\\s*unban .*$`,
                    fnc: 'unban'
                }
            ]
        })

    }

    async restartpu(e) {
        if (!this.e.isMaster) {
            return false
        }
        try {
            await atlas.restart()
            send.send_with_At(e, `成功`)
        } catch (err) {
            send.send_with_At(e, err)
        }
    }

    async backup(e) {
        if (!e.isMaster) {
            return false
        }
        try {
            let zip = await getBackup.backup()
            send.send_with_At(e, `${zip.zipName} 成功备份到 ./backup 目录下`)
            if (e.msg.replace(/^[#/].*backup/, '').includes('back')) {
                fCompute.sendFile(e, await zip.zip.generateAsync({ type: 'nodebuffer' }), zip.zipName)
            }
        } catch (err) {
            logger.info(err)
            send.send_with_At(e, err)
        }
    }

    restore(e) {
        if (!e.isMaster) {
            return false
        }
        try {
            let msg = ''
            for (let i in fs.readdirSync(backupPath).reverse()) {
                msg += `[${i}]${fs.readdirSync(backupPath)[i]}\n`
            }
            send.send_with_At(e, '请选择需要恢复的备份文件：\n' + msg)
            this.setContext('doRestore', false, 30, '超时已取消，请注意 @Bot 进行回复哦！')
        } catch (err) {
            logger.info(err)
            send.send_with_At(e, err)
        }

    }

    async doRestore() {
        let e = this.e
        if (!e.isMaster) {
            return false
        }

        try {
            let fileName = fs.readdirSync(backupPath)[Number(e.msg.replace(/\s*/g, ''))]
            let filePath = path.join(backupPath, fileName)
            await getBackup.restore(filePath)
            send.send_with_At(e, `[${e.msg}] ${fs.readdirSync(backupPath).reverse()[e.msg.replace(/\s*/g, '')]} 恢复成功`)
        } catch (err) {
            logger.info(err)
            send.send_with_At(e, [`第[${e.msg}]项不存在QAQ！`, err])
        }
        this.finish('doRestore', false)
    }

    async get(e) {
        if (!e.isMaster) {
            return false
        }
        let msg = Number(e.msg.match(/[0-9]*$/)[0])
        console.info(msg)
        let token = await getRksRank.getRankUser(msg - 1, msg)
        console.info(token)
        send.send_with_At(e, token)
    }

    async del(e) {
        if (!e.isMaster) {
            return false
        }
        let msg = e.msg.match(/[0-9a-zA-Z]{25}$/)[0]
        await getSave.delSaveBySessionToken(msg)
        await getSave.banSessionToken(msg)
        send.send_with_At(e, '成功')
    }

    async allow(e) {
        if (!e.isMaster) {
            return false
        }
        let msg = e.msg.match(/[0-9a-zA-Z]{25}$/)[0]
        console.info(msg)
        await getSave.allowSessionToken(msg)
        console.info(await getSave.isBanSessionToken(msg))
        send.send_with_At(e, '成功')
    }

    async ban(e) {
        if (!e.isAdmin && !e.isMaster) {
            return false
        }
        if (!e.group_id) {
            send.send_with_At(e, '请在群聊中使用呐！')
            return false
        }

        let msg = e.msg.replace(/^.*ban\s*/, '');
        switch (msg) {
            case 'all': {
                for (let i in banSetting) {
                    await redis.set(`${redisPath}:banGroup:${e.group_id}:${banSetting[i]}`, 1);
                }
                break
            }
            default: {
                for (let i in banSetting) {
                    if (banSetting[i] == msg) {
                        await redis.set(`${redisPath}:banGroup:${e.group_id}:${banSetting[i]}`, 1);
                        break
                    }
                }
                break
            }
        }
        // console.info(await redis.keys(`${redisPath}:banGroup:*`))
        send.send_with_At(e, `当前群聊: ${e.group_id}\n已禁用:\n${(await redis.keys(`${redisPath}:banGroup:${e.group_id}:*`)).join('\n').replace(new RegExp(`${redisPath}:banGroup:${e.group_id}:`, 'g'), '')}`)
    }
    async unban(e) {
        if (!e.isAdmin && !e.isMaster) {
            return false
        }
        if (!e.group_id) {
            send.send_with_At(e, '请在群聊中使用呐！')
            return false
        }
        let msg = e.msg.replace(/^.*unban\s*/, '');
        switch (msg) {
            case 'all': {
                for (let i in banSetting) {
                    await redis.del(`${redisPath}:banGroup:${e.group_id}:${banSetting[i]}`);
                }
                break
            }
            default: {
                for (let i in banSetting) {
                    if (banSetting[i] == msg) {
                        await redis.del(`${redisPath}:banGroup:${e.group_id}:${banSetting[i]}`);
                        break
                    }
                }
                break
            }
        }
        // console.info(await redis.keys(`${redisPath}:banGroup:*`))
        send.send_with_At(e, `当前群聊: ${e.group_id}\n已禁用:\n${(await redis.keys(`${redisPath}:banGroup:${e.group_id}:*`)).join('\n').replace(new RegExp(`${redisPath}:banGroup:${e.group_id}:`, 'g'), '')}`)
    }
}