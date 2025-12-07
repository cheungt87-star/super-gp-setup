-- Add phone_ext column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_ext text;

-- Add phone_ext column to sites table
ALTER TABLE public.sites 
ADD COLUMN phone_ext text;