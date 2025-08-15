#!/usr/bin/python3

import pymodbus.client as ModbusClient
from pymodbus import (
    FramerType,
    ModbusException,
    pymodbus_apply_logging_config,
)

modbus_ip = "192.168.10.71"
inverter_id = 1

client = ModbusClient.ModbusTcpClient(modbus_ip, port=502, framer=FramerType.SOCKET)
client.connect()

# Phase Control
try:
    result = client.read_input_registers(40030, count=1, slave=247)
except ModbusException as exc:
    print("Received ModbusException({exc}) from library")
    client.close()
    exit(0)
if not result.isError():
    value_int16 = client.convert_from_registers(result.registers, data_type=client.DATATYPE.INT16)
    print("Independent Phase Control active:", "Yes" if value_int16 != 0 else "No")
else:
    print ("error=", result)
client.close()