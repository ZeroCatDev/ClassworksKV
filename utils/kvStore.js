import {prisma} from "./prisma.js";
import {keysTotal} from "./metrics.js";

class KVStore {
    /**
     * 通过设备ID和键名获取值
     * @param {number} deviceid - 设备ID
     * @param {string} key - 键名
     * @returns {object|null} 键对应的值或null
     */
    async get(deviceid, key) {
        const item = await prisma.kvstore.findUnique({
            where: {
                deviceid_key: {
                    deviceid: deviceid,
                    key: key,
                },
            },
        });
        return item ? item.value : null;
    }

    /**
     * 获取键的完整信息（包括元数据）
     * @param {number} deviceid - 设备ID
     * @param {string} key - 键名
     * @returns {object|null} 键的完整信息或null
     */
    async getMetadata(deviceid, key) {
        const item = await prisma.kvstore.findUnique({
            where: {
                deviceid_key: {
                    deviceid: deviceid,
                    key: key,
                },
            },
            select: {
                key: true,
                deviceid: true,
                creatorip: true,
                createdat: true,
                updatedat: true,
            },
        });

        if (!item) return null;

        // 转换为更友好的格式
        return {
            deviceid: item.deviceid,
            key: item.key,
            metadata: {
                creatorip: item.creatorip,
                createdat: item.createdat,
                updatedat: item.updatedat,
            },
        };
    }

    /**
     * 在指定设备下创建或更新键值
     * @param {number} deviceid - 设备ID
     * @param {string} key - 键名
     * @param {object} value - 键值
     * @param {string} creatorip - 创建者IP，可选
     * @returns {object} 创建或更新的记录
     */
    async upsert(deviceid, key, value, creatorip = "") {
        const item = await prisma.kvstore.upsert({
            where: {
                deviceid_key: {
                    deviceid: deviceid,
                    key: key,
                },
            },
            update: {
                value,
                ...(creatorip && {creatorip}),
            },
            create: {
                deviceid: deviceid,
                key: key,
                value,
                creatorip: creatorip,
            },
        });

        // 更新键总数指标
        const totalKeys = await prisma.kvstore.count();
        keysTotal.set(totalKeys);

        // 返回带有设备ID和原始键的结果
        return {
            deviceid,
            key,
            value: item.value,
            creatorip: item.creatorip,
            createdat: item.createdat,
            updatedat: item.updatedat,
        };
    }

    /**
     * 批量创建或更新键值对（优化性能）
     * @param {number} deviceid - 设备ID
     * @param {object} data - 键值对数据 {key1: value1, key2: value2, ...}
     * @param {string} creatorip - 创建者IP，可选
     * @returns {object} {results: Array, errors: Array}
     */
    async batchUpsert(deviceid, data, creatorip = "") {
        const results = [];
        const errors = [];

        // 使用事务处理所有操作
        await prisma.$transaction(async (tx) => {
            for (const [key, value] of Object.entries(data)) {
                try {
                    const item = await tx.kvstore.upsert({
                        where: {
                            deviceid_key: {
                                deviceid: deviceid,
                                key: key,
                            },
                        },
                        update: {
                            value,
                            ...(creatorip && {creatorip: creatorip}),
                        },
                        create: {
                            deviceid: deviceid,
                            key: key,
                            value,
                            creatorip: creatorip,
                        },
                    });

                    results.push({
                        key: item.key,
                        created: item.createdat.getTime() === item.updatedat.getTime(),
                        createdat: item.createdat,
                        updatedat: item.updatedat,
                    });
                } catch (error) {
                    errors.push({
                        key,
                        error: error.message,
                    });
                }
            }
        });

        // 在事务完成后，一次性更新指标
        const totalKeys = await prisma.kvstore.count();
        keysTotal.set(totalKeys);

        return { results, errors };
    }

    /**
     * 通过设备ID和键名删除
     * @param {number} deviceid - 设备ID
     * @param {string} key - 键名
     * @returns {object|null} 删除的记录或null
     */
    async delete(deviceid, key) {
        try {
            const item = await prisma.kvstore.delete({
                where: {
                    deviceid_key: {
                        deviceid: deviceid,
                        key: key,
                    },
                },
            });

            // 更新键总数指标
            const totalKeys = await prisma.kvstore.count();
            keysTotal.set(totalKeys);

            return item ? {...item, deviceid, key} : null;
        } catch (error) {
            // 忽略记录不存在的错误
            if (error.code === "P2025") {
                return null;
            }
            throw error;
        }
    }

    /**
     * 列出指定设备下的所有键名及其元数据
     * @param {number} deviceid - 设备ID
     * @param {object} options - 选项参数
     * @returns {Array} 键名和元数据数组
     */
    async list(deviceid, options = {}) {
        const {sortBy = "key", sortDir = "asc", limit = 100, skip = 0} = options;

        // 构建排序条件
        const orderBy = {};
        orderBy[sortBy] = sortDir.toLowerCase();

        // 查询设备的所有键
        const items = await prisma.kvstore.findMany({
            where: {
                deviceid: deviceid,
            },
            select: {
                deviceid: true,
                key: true,
                creatorip: true,
                createdat: true,
                updatedat: true,
                value: false,
            },
            orderBy,
            take: limit,
            skip: skip,
        });

        // 处理结果
        return items.map((item) => ({
            deviceid: item.deviceid,
            key: item.key,
            metadata: {
                creatorip: item.creatorip,
                createdat: item.createdat,
                updatedat: item.updatedat,
            },
        }));
    }

    /**
     * 获取指定设备下的键名列表（不包括内容）
     * @param {number} deviceid - 设备ID
     * @param {object} options - 查询选项
     * @returns {Array} 键名列表
     */
    async listKeysOnly(deviceid, options = {}) {
        const {sortBy = "key", sortDir = "asc", limit = 100, skip = 0} = options;

        // 构建排序条件
        const orderBy = {};
        orderBy[sortBy] = sortDir.toLowerCase();

        // 查询设备的所有键，只选择键名
        const items = await prisma.kvstore.findMany({
            where: {
                deviceid: deviceid,
            },
            select: {
                key: true,
            },
            orderBy,
            take: limit,
            skip: skip,
        });

        // 只返回键名数组
        return items.map((item) => item.key);
    }

    /**
     * 统计指定设备下的键值对数量
     * @param {number} deviceid - 设备ID
     * @returns {number} 键值对数量
     */
    async count(deviceid) {
        const count = await prisma.kvstore.count({
            where: {
                deviceid: deviceid,
            },
        });
        return count;
    }

    /**
     * 获取指定设备的统计信息
     * @param {number} deviceid - 设备ID
     * @returns {object} 统计信息
     */
    async getStats(deviceid) {
        const [totalKeys, oldestKey, newestKey] = await Promise.all([
            prisma.kvstore.count({
                where: { deviceid },
            }),
            prisma.kvstore.findFirst({
                where: { deviceid },
                orderBy: { createdat: "asc" },
                select: { createdat: true, key: true },
            }),
            prisma.kvstore.findFirst({
                where: { deviceid },
                orderBy: { updatedat: "desc" },
                select: { updatedat: true, key: true },
            }),
        ]);

        return {
            totalKeys,
            oldestKey: oldestKey?.key,
            oldestCreatedAt: oldestKey?.createdat,
            newestKey: newestKey?.key,
            newestUpdatedAt: newestKey?.updatedat,
        };
    }
}

export default new KVStore();
