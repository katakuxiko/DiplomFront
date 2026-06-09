import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Empty, Form, Input, Skeleton, Switch } from "antd";
import { useEffect, useState } from "react";
import { api } from "../axios";
import { rules } from "../utils/rules";
import { useSetHead } from "../hooks";

export const Admins = () => {
  useSetHead("Админы");

  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [isOpen, setIsOpen] = useState(false);

  const [initItem, setInitItem] = useState<{
    id?: string;
    username?: string;
    is_super_user?: boolean;
  }>();

  // ---------------- GET ADMINS ----------------
  const { data, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const res = await api.admins.adminsList();

      console.log("ADMINS RAW:", res.data);

      // FIX: backend returns DtoAdminResponse[][]
      return (res.data ?? []).flat();
    },
  });

  // ---------------- CREATE / UPDATE ----------------
  const mutation = useMutation({
    mutationFn: async (values: {
      username: string;
      password?: string;
      is_super_user?: boolean;
    }) => {
      const payload: any = {
        username: values.username,
        is_super_user: values.is_super_user,
      };

      // password only for create
      if (!initItem?.id) {
        payload.password = values.password;
      }

      if (initItem?.id) {
        return api.admins.adminsUpdate(initItem.id, payload);
      }

      return api.admins.adminsCreate(payload);
    },

    onSuccess: () => {
      form.resetFields();
      setIsOpen(false);
      setInitItem(undefined);
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });

  // ---------------- EDIT PREFILL ----------------
  useEffect(() => {
    if (initItem) {
      form.setFieldsValue({
        username: initItem.username,
        is_super_user: initItem.is_super_user ?? false,
        password: undefined,
      });
    }
  }, [initItem, form]);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <>
      {/* ---------------- EMPTY STATE ---------------- */}
      {!data || data.length === 0 ? (
        <Empty
          description={
            <div className="flex flex-col gap-2">
              Нет админов
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setIsOpen(true)}
              >
                Создать
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {/* ---------------- ADMIN CARDS ---------------- */}
          {data.map((admin) => (
            <div
              key={admin.id}
              className="p-4 bg-white rounded-xl shadow-xl flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <div className="font-semibold">
                  {admin.username ?? "no-username"}
                </div>

                <div className="flex gap-2">
                  {/* EDIT */}
                  <EditOutlined
                    className="hover:bg-gray-200 p-1 rounded cursor-pointer"
                    onClick={() => {
                      setInitItem(admin);
                      setIsOpen(true);
                    }}
                  />

                  {/* DELETE */}
                  <DeleteOutlined
                    className="text-red-500 hover:bg-red-100 p-1 rounded cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();

                      if (!admin.id) return;

                      await api.admins.adminsDelete(admin.id);

                      queryClient.invalidateQueries({
                        queryKey: ["admins"],
                      });
                    }}
                  />
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {admin.is_super_user ? "Super Admin" : "Admin"}
              </div>
            </div>
          ))}

          {/* ---------------- CREATE BUTTON ---------------- */}
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setIsOpen(true)}
            className="min-h-full"
          >
            Создать
          </Button>
        </div>
      )}

      {/* ---------------- DRAWER ---------------- */}
      <Drawer
        title={initItem ? "Редактировать админа" : "Создать админа"}
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setInitItem(undefined);
          form.resetFields();
        }}
        extra={
          initItem?.id && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={async () => {
                if (!initItem.id) return;

                await api.admins.adminsDelete(initItem.id);

                setIsOpen(false);
                setInitItem(undefined);
                form.resetFields();

                queryClient.invalidateQueries({
                  queryKey: ["admins"],
                });
              }}
            >
              Удалить
            </Button>
          )
        }
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={(values) => mutation.mutate(values)}
        >
          <Form.Item name="username" label="Username" rules={[rules.required]}>
            <Input />
          </Form.Item>

          {!initItem?.id && (
            <Form.Item
              name="password"
              label="Password"
              rules={[rules.required]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item
            name="is_super_user"
            label="Super Admin"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit">
            Сохранить
          </Button>
        </Form>
      </Drawer>
    </>
  );
};
