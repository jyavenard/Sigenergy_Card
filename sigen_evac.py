#!/usr/bin/python3

import pymodbus.client as ModbusClient
from pymodbus import (
    FramerType,
    ModbusException,
    pymodbus_apply_logging_config,
)

modbus_ip = "192.168.10.71" # change this for your use

client = ModbusClient.ModbusTcpClient(modbus_ip, port=502, framer=FramerType.SOCKET)
client.connect()

for slave_id in range(1, 247):
    print("testing id", slave_id)
    try:
        result = client.read_input_registers(32001, count=2, slave=slave_id)
    except ModbusException as exc:
        print("Received ModbusException({exc}) from library for id", slave_id)
        continue
    if not result.isError():
        value_uint32 = client.convert_from_registers(result.registers, data_type=client.DATATYPE.UINT32)
        print("evac found at address", slave_id)
        print("Total energy consumed", value_uint32 / 100.0, 'kWh')
        client.close()
        exit(0)
    else:
        print ("error=", result, "for id=", slave_id)
